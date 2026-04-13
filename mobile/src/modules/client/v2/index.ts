import React from "react";
import type { AuthSession } from "../../../app/navigation/role-navigation-resolver";
import { ClientDataProvider } from "./ClientDataContext";
import { ClientNavigator } from "./ClientNavigator";

type ClientHomeV2Props = {
  session: AuthSession;
  accessToken: string;
  onLogout: () => void;
};

export function ClientHomeV2(props: ClientHomeV2Props) {
  return (
    <ClientDataProvider 
      session={props.session}
      accessToken={props.accessToken}
      onLogout={props.onLogout}
    >
      <ClientNavigator />
    </ClientDataProvider>
  );
}
