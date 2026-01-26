import { SlopeProfile } from "../charts/slope-profile.js";

export function createSlopeProfile({ data, options = {} } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "fswepp-slope-profile";
  wrapper.style.width = "100%";
  wrapper.style.minHeight = options.minHeight
    ? `${options.minHeight}px`
    : "220px";

  const profile = new SlopeProfile(wrapper, options);
  if (data) profile.setData(data);

  return {
    wrapper,
    profile,
    setData: (next) => profile.setData(next),
    destroy: () => profile.destroy(),
  };
}
