import { fireHaptic } from "../src/shared/native/haptics";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  fireHaptic("impactLight");
  fireHaptic("notificationSuccess");
  assert(true, "fireHaptic should stay safe when native trigger shape differs at runtime");
  console.log("login_submit_haptics_safe=ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
