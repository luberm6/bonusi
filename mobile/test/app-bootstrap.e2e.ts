import { MobileAppBootstrap } from "../src/app/bootstrap/mobile-app-bootstrap";
import type { MobileRuntime } from "../src/app/runtime/mobile-runtime";
import type { AuthSession } from "../src/app/navigation/role-navigation-resolver";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function createRuntimeStub() {
  let started = false;
  let stopped = false;
  const runtime: MobileRuntime = {
    store: {} as never,
    sync: {} as never,
    reconnect: {
      async start() {
        started = true;
      },
      stop() {
        stopped = true;
      }
    } as never
  };
  return {
    runtime,
    get started() {
      return started;
    },
    get stopped() {
      return stopped;
    }
  };
}

async function run() {
  const anonymous = new MobileAppBootstrap({
    restoreSession: async () => null,
    getAccessToken: () => ""
  });
  const anonymousState = await anonymous.start();
  assert(anonymousState.phase === "anonymous", "anonymous bootstrap should stay anonymous");
  console.log("app_bootstrap_anonymous=ok");

  const runtimeStub = createRuntimeStub();
  let capturedSession: AuthSession | null = null;
  const authenticated = new MobileAppBootstrap({
    restoreSession: async () => ({
      userId: "client-1",
      role: "client",
      token: "token"
    }),
    getAccessToken: () => "token",
    runtimeFactory: async () => runtimeStub.runtime,
    onStateChange(state) {
      if (state.phase === "ready") capturedSession = state.session;
    }
  });

  const readyState = await authenticated.start();
  assert(readyState.phase === "ready", "authenticated bootstrap should produce ready state");
  assert(readyState.navigation.defaultPath === "/home", "client default path should be /home");
  assert(capturedSession?.userId === "client-1", "ready session should be published via callback");
  assert(runtimeStub.started, "reconnect.start should be called for ready state");

  authenticated.stop();
  assert(runtimeStub.stopped, "reconnect.stop should be called on stop");
  console.log("app_bootstrap_runtime_wired=ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

