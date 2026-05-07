import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClientHomeScreen } from "../src/modules/client/home/ClientHomeScreen";

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
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  });
}

function findPressableByLabel(root: TestRenderer.ReactTestInstance, label: string) {
  return root.find((node) => {
    if (typeof node.props?.onPress !== "function") return false;
    const texts = node.findAllByType(Text).map((child) => child.props.children).flat().join(" ");
    return texts.includes(label);
  });
}

function hasText(root: TestRenderer.ReactTestInstance, expected: string) {
  return root
    .findAllByType(Text)
    .some((node) => String(node.props.children ?? "").includes(expected));
}

function renderClientHome(props: React.ComponentProps<typeof ClientHomeScreen>) {
  return TestRenderer.create(
    <SafeAreaProvider>
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
    jest.resetAllMocks();
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
