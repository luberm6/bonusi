import {
  resolveNavigationAfterLogin,
  type AuthSession,
  type NavigationResolution
} from "../navigation/role-navigation-resolver";
import {
  createMobileRuntimeWithExpo,
  type MobileRuntime
} from "../runtime/mobile-runtime";

export type AppBootstrapState =
  | {
      phase: "anonymous";
      session: null;
      navigation: null;
      runtime: null;
    }
  | {
      phase: "ready";
      session: AuthSession;
      navigation: NavigationResolution;
      runtime: MobileRuntime;
    };

export type MobileAppBootstrapInput = {
  restoreSession: () => Promise<AuthSession | null>;
  getAccessToken: () => string;
  runtimeFactory?: (input: {
    currentUserId: string;
    getAccessToken: () => string;
  }) => Promise<MobileRuntime>;
  onStateChange?: (state: AppBootstrapState) => void;
};

const EMPTY_STATE: AppBootstrapState = {
  phase: "anonymous",
  session: null,
  navigation: null,
  runtime: null
};

export class MobileAppBootstrap {
  private state: AppBootstrapState = EMPTY_STATE;
  private stopped = false;
  private readonly runtimeFactory: NonNullable<MobileAppBootstrapInput["runtimeFactory"]>;

  constructor(private readonly input: MobileAppBootstrapInput) {
    this.runtimeFactory = input.runtimeFactory ?? createMobileRuntimeWithExpo;
  }

  getState(): AppBootstrapState {
    return this.state;
  }

  async start(): Promise<AppBootstrapState> {
    const session = await this.input.restoreSession();
    if (!session || this.stopped) {
      this.state = EMPTY_STATE;
      this.input.onStateChange?.(this.state);
      return this.state;
    }

    const navigation = resolveNavigationAfterLogin(session);
    const runtime = await this.runtimeFactory({
      currentUserId: session.userId,
      getAccessToken: this.input.getAccessToken
    });
    if (this.stopped) {
      runtime.reconnect.stop();
      this.state = EMPTY_STATE;
      this.input.onStateChange?.(this.state);
      return this.state;
    }

    await runtime.reconnect.start();
    this.state = {
      phase: "ready",
      session,
      navigation,
      runtime
    };
    this.input.onStateChange?.(this.state);
    return this.state;
  }

  stop(): void {
    this.stopped = true;
    if (this.state.phase === "ready") {
      this.state.runtime.reconnect.stop();
    }
    this.state = EMPTY_STATE;
    this.input.onStateChange?.(this.state);
  }
}

export async function bootstrapMobileApp(input: MobileAppBootstrapInput): Promise<MobileAppBootstrap> {
  const bootstrap = new MobileAppBootstrap(input);
  await bootstrap.start();
  return bootstrap;
}

