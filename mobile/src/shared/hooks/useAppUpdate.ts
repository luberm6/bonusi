import { useEffect, useState } from "react";
import { updateService, AppUpdateMetadata } from "../services/UpdateService";

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateMetadata | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const result = await updateService.checkUpdate();
      if (result.hasUpdate && result.metadata) {
        setUpdateInfo(result.metadata);
      }
    } finally {
      setChecking(false);
    }
  };

  const performUpdate = async () => {
    if (updateInfo) {
      await updateService.performUpdate(updateInfo);
    }
  };

  const dismiss = () => {
    setUpdateInfo(null);
  };

  useEffect(() => {
    void check();
  }, []);

  return {
    updateInfo,
    checking,
    performUpdate,
    dismiss
  };
}
