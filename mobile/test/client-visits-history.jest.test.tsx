import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClientHomeScreen } from "../src/modules/client/home/ClientHomeScreen";

jest.mock("react-native", () => {
  const React = require("react");

  const createComponent =
    (name: string) =>
    ({ children, style, ...props }: { children?: React.ReactNode; style?: unknown }) =>
      React.createElement(name, { ...props, style }, children);

  const Pressable = ({ children, style, ...props }: { children?: React.ReactNode; style?: unknown }) =>
    React.createElement(
      "Pressable",
      { ...props, style: typeof style === "function" ? style({ pressed: false }) : style },
      children
    );

  const ScrollView = React.forwardRef(
    ({ children, ...props }: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        scrollToEnd: jest.fn()
      }));
      return React.createElement("ScrollView", props, children);
    }
  );

  class AnimatedValue {
    value: number;
    constructor(initialValue: number) {
      this.value = initialValue;
    }
    setValue(next: number) {
      this.value = next;
    }
    interpolate() {
      return this.value;
    }
  }

  const animation = {
    start: (callback?: () => void) => callback?.(),
    stop: jest.fn()
  };

  return {
    ActivityIndicator: createComponent("ActivityIndicator"),
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() }))
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 390, height: 844 }))
    },
    Easing: {
      cubic: jest.fn(),
      ease: jest.fn(),
      in: jest.fn((value) => value),
      inOut: jest.fn((value) => value),
      out: jest.fn((value) => value)
    },
    Image: createComponent("Image"),
    KeyboardAvoidingView: createComponent("KeyboardAvoidingView"),
    PanResponder: {
      create: jest.fn(() => ({ panHandlers: {} }))
    },
    Platform: {
      OS: "ios",
      select: (options: Record<string, unknown>) => options.ios ?? options.default
    },
    Pressable,
    ScrollView,
    StyleSheet: {
      absoluteFillObject: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      create: <T extends object>(styles: T) => styles
    },
    Text: createComponent("Text"),
    TextInput: createComponent("TextInput"),
    TurboModuleRegistry: {
      get: jest.fn(() => ({
        getConstants: () => ({
          initialWindowMetrics: {
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, left: 0, right: 0, bottom: 0 }
          }
        })
      })),
      getEnforcing: jest.fn(() => ({
        getConstants: () => ({})
      }))
    },
    View: createComponent("View"),
    Animated: {
      Value: AnimatedValue,
      View: createComponent("AnimatedView"),
      loop: jest.fn(() => animation),
      parallel: jest.fn(() => animation),
      sequence: jest.fn(() => animation),
      spring: jest.fn(() => animation),
      timing: jest.fn(() => animation)
    }
  };
});

jest.mock("../src/shared/native/haptics", () => ({
  fireHaptic: jest.fn()
}));

jest.mock("../src/shared/native/open-url", () => ({
  safeOpenExternalUrl: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../src/shared/config/mobile-env", () => ({
  mobileEnv: {
    apiBaseUrl: "http://example.test/api/v1"
  }
}));

type FetchResponseMap = Record<string, unknown>;

function createFetchMock(responses: FetchResponseMap) {
  return jest.fn(async (input: string) => {
    const normalized = String(input);
    if (normalized.includes("api.open-meteo.com")) {
      return new Response(JSON.stringify({ current_weather: { temperature: 15, weathercode: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    const entry = Object.entries(responses).find(([path]) => normalized.includes(path));
    if (!entry) {
      return new Response(JSON.stringify({ message: `unexpected url: ${normalized}` }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }
    return new Response(JSON.stringify(entry[1]), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  });
}

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function findPressableByLabel(root: TestRenderer.ReactTestInstance, label: string) {
  const match = root.findAll((node) => {
    if (typeof node.props?.onPress !== "function") return false;
    const texts = collectNodeText(node);
    return texts.includes(label);
  });
  if (match[0]) return match[0];

  const visibleText = collectNodeText(root);
  throw new Error(`Pressable with label "${label}" not found. Visible text: ${visibleText}`);
}

function hasText(root: TestRenderer.ReactTestInstance, expected: string) {
  return collectNodeText(root).includes(expected);
}

function collectNodeText(node: TestRenderer.ReactTestInstance): string {
  return node.children.map(collectText).filter(Boolean).join(" ");
}

function collectText(value: TestRenderer.ReactTestInstance | unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value) return "";
  if (Array.isArray(value)) return value.map(collectText).filter(Boolean).join(" ");
  if (typeof value === "object" && "children" in value && Array.isArray(value.children)) {
    return value.children.map(collectText).filter(Boolean).join(" ");
  }
  if (React.isValidElement(value)) {
    return collectText((value.props as { children?: unknown }).children);
  }
  return "";
}

function renderClientHome(props: React.ComponentProps<typeof ClientHomeScreen>) {
  return TestRenderer.create(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 }
      }}
    >
      <ClientHomeScreen {...props} />
    </SafeAreaProvider>
  );
}

describe("история посещений клиента", () => {
  const baseProps = {
    session: {
      userId: "client-1",
      role: "client" as const,
      email: "client@example.com",
      token: "token"
    },
    accessToken: "token",
    onLogout: jest.fn()
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("показывает список посещений и открывает детали визита", async () => {
    global.fetch = createFetchMock({
      "/users/me": {
        id: "client-1",
        email: "client@example.com",
        fullName: "Клиент",
        role: "client"
      },
      "/bonuses/balance": {
        balance: 120
      },
      "/clients/client-1/visits": [
        {
          id: "visit-1",
          visitDate: "2026-04-01T08:24:54.968Z",
          branchName: "Северный филиал",
          finalAmount: 280,
          totalAmount: 280,
          discountAmount: 0,
          bonusAccrualAmount: 14,
          serviceNames: ["Мойка", "Полировка"]
        }
      ],
      "/visits/visit-1": {
        id: "visit-1",
        visitDate: "2026-04-01T08:24:54.968Z",
        branchName: "Северный филиал",
        adminName: "Администратор",
        comment: "Проверили кузов",
        totalAmount: 280,
        discountAmount: 0,
        finalAmount: 280,
        bonusAccrualAmount: 14,
        visitServices: [
          {
            id: "svc-1",
            serviceNameSnapshot: "Полировка",
            price: 80,
            quantity: 2,
            total: 160
          },
          {
            id: "svc-2",
            serviceNameSnapshot: "Мойка",
            price: 120,
            quantity: 1,
            total: 120
          }
        ]
      }
    }) as typeof fetch;

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderClientHome(baseProps);
    });
    await flush();

    const visitsButton = findPressableByLabel(renderer.root, "История визитов");
    await act(async () => {
      visitsButton.props.onPress();
    });
    await flush();

    expect(renderer.root.findAllByProps({ children: "Северный филиал" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ children: "Мойка" }).length).toBeGreaterThan(0);

    const detailPressable = findPressableByLabel(renderer.root, "Нажмите, чтобы открыть детали посещения.");
    await act(async () => {
      detailPressable.props.onPress();
    });
    await flush();

    expect(hasText(renderer.root, "Детали посещения")).toBe(true);
    expect(hasText(renderer.root, "Полировка")).toBe(true);
    expect(hasText(renderer.root, "Проверили кузов")).toBe(true);
  });

  test("показывает пустое состояние, если посещений нет", async () => {
    global.fetch = createFetchMock({
      "/users/me": {
        id: "client-1",
        email: "client@example.com",
        fullName: "Клиент",
        role: "client"
      },
      "/bonuses/balance": {
        balance: 0
      },
      "/clients/client-1/visits": []
    }) as typeof fetch;

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderClientHome(baseProps);
    });
    await flush();

    const visitsButton = findPressableByLabel(renderer.root, "История визитов");
    await act(async () => {
      visitsButton.props.onPress();
    });
    await flush();

    expect(hasText(renderer.root, "У вас пока нет посещений")).toBe(true);
    expect(hasText(renderer.root, "После первого визита история появится здесь.")).toBe(true);
  });
});
