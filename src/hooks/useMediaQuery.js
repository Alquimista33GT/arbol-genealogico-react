import { useEffect, useState } from "react";

export function useMediaQuery(query, defaultState = false) {
  function getMatches() {
    if (typeof window === "undefined") return defaultState;
    return window.matchMedia(query).matches;
  }

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);

    setMatches(mediaQueryList.matches);

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", onChange);
    } else {
      mediaQueryList.addListener(onChange);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", onChange);
      } else {
        mediaQueryList.removeListener(onChange);
      }
    };
  }, [query, defaultState]);

  return matches;
}