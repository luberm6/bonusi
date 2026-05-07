import { registerRootComponent } from "expo";
import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App) on native,
// but on web it also calls AppRegistry.runApplication() to mount React into #root.
// The old AppRegistry.registerComponent() only registered but never mounted on web → white screen.
registerRootComponent(App);
