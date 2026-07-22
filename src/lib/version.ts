const CURRENT_VERSION = "v2.4";

export function checkAppVersion() {
  const userVersion = localStorage.getItem("app_version");

  if (userVersion !== CURRENT_VERSION) {
    localStorage.clear();
    localStorage.setItem("app_version", CURRENT_VERSION);
  }
}
