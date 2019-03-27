import { Action, NgxsOnInit, Selector, State, StateContext, Store } from '@ngxs/store';
import { throwError } from 'rxjs';
import { catchError, finalize, flatMap, map, take, tap } from 'rxjs/operators';
import { AuthState, Logout } from '../../auth/stores/auth.state';
import { errorToMessage } from '../../shared/util/api-error';
import { ProjectRole } from '../models/project-role';
import { ProjectUser } from '../models/project-user';
import { ProjectUserService } from '../services/project-user.service';
import { ClearCurrentProject, SetCurrentProject } from './projects.state';
import { ProjectInvite } from '../models/project-invite';
import { ProjectInviteService } from '../services/project-invite.service';

export class ClearMessages {
  static readonly type = '[ProjectUser] Clear messages';
}

export class GetProjectInvites {
  static readonly type = '[ProjectInvite] Get project invites';
  constructor(public projectId: string) {}
}

export class AddProjectInvite {
  static readonly type = '[ProjectInvite] Add project invite';
  constructor(public projectId: string, public email: string, public role: ProjectRole) {}
}

export class UpdateProjectInvite {
  static readonly type = '[ProjectInvite] Update project invite';
  constructor(public projectId: string, public inviteId: string, public role: ProjectRole) {}
}

export class RemoveProjectInvite {
  static readonly type = '[ProjectInvite] Remove project invite';
  constructor(public projectId: string, public inviteId: string) {}
}

export interface ProjectInviteStateModel {
  invites: ProjectInvite[];
  isLoading: boolean;
  errorMessage: string | undefined;
}

const stateDefaults = {
  invites: [],
  isLoading: false,
  errorMessage: undefined,
};

@State<ProjectInviteStateModel>({
  name: 'projectInvites',
  defaults: stateDefaults,
})
export class ProjectInviteState implements NgxsOnInit {
  constructor(private projectInviteService: ProjectInviteService, private store: Store) {}

  @Selector()
  static isLoading(state: ProjectInviteStateModel) {
    return state.isLoading;
  }

  @Selector()
  static invites(state: ProjectInviteStateModel) {
    return state.invites;
  }

  ngxsOnInit(ctx: StateContext<ProjectInviteStateModel>) {}

  @Action(SetCurrentProject)
  setCurrentProject(ctx: StateContext<ProjectInviteStateModel>, action: SetCurrentProject) {
    // Whenever the current project changes, retrieve the project users to know which role the current user has
    ctx.dispatch(new GetProjectInvites(action.id));
  }

  @Action(Logout)
  logout(ctx: StateContext<ProjectInviteStateModel>, action: Logout) {
    ctx.setState(stateDefaults);
  }

  @Action(GetProjectInvites)
  getProjectInvites(ctx: StateContext<ProjectInviteStateModel>, action: GetProjectInvites) {
    ctx.patchState({ isLoading: true });
    return this.projectInviteService.find(action.projectId).pipe(
        tap(invites => ctx.patchState({ invites })),
        catchError(error => {
            ctx.patchState({ errorMessage: errorToMessage(error) });
            return throwError(error);
          }),
        finalize(() => ctx.patchState({ isLoading: false })),
    )
  }

  @Action(AddProjectInvite)
  addProjectInvite(ctx: StateContext<ProjectInviteStateModel>, action: AddProjectInvite) {
    ctx.patchState({ isLoading: true });
    return this.projectInviteService.create(action.projectId, action.email, action.role).pipe(
      tap(invites => ctx.patchState({ invites: [invites, ...ctx.getState().invites] })),
      catchError(error => {
        ctx.patchState({ errorMessage: errorToMessage(error, 'AddProjectInvite') });
        return throwError(error);
      }),
      finalize(() => ctx.patchState({ isLoading: false })),
    );
  }

  @Action(UpdateProjectInvite)
  updateProjectInvite(ctx: StateContext<ProjectInviteStateModel>, action: UpdateProjectInvite) {
    ctx.patchState({ isLoading: true });
    return this.projectInviteService.update(action.projectId, action.inviteId, action.role).pipe(
      tap(updatedInvite => {
        const invites = ctx.getState().invites.map(invite => {
          if (invite.inviteId === action.inviteId) {
            return updatedInvite;
          } else {
            return invite;
          }
        });
        ctx.patchState({ invites });
      }),
      catchError(error => {
        ctx.patchState({ errorMessage: errorToMessage(error) });
        return throwError(error);
      }),
      finalize(() => ctx.patchState({ isLoading: false })),
    );
  }

  @Action(RemoveProjectInvite)
  removeProjectUser(ctx: StateContext<ProjectInviteStateModel>, action: RemoveProjectInvite) {
    ctx.patchState({ isLoading: true });
    return this.projectInviteService.remove(action.projectId, action.inviteId).pipe(
      tap(() => {
        const invites = ctx.getState().invites.filter(invite => invite.inviteId !== action.inviteId);
        ctx.patchState({ invites });
      }),
      catchError(error => {
        ctx.patchState({ errorMessage: errorToMessage(error) });
        return throwError(error);
      }),
      finalize(() => ctx.patchState({ isLoading: false })),
    );
  }

  @Action(ClearMessages)
  clearMessages(ctx: StateContext<ProjectInviteStateModel>) {
    ctx.patchState({ errorMessage: undefined });
  }

  @Action(ClearCurrentProject)
  clearCurrentProject(ctx: StateContext<ProjectInviteStateModel>) {
    ctx.patchState(stateDefaults);
  }
}
