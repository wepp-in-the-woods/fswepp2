import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useNavbarVisibility = () => {
  const [isNavbarVisible, setNavbarVisible] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      if (location.pathname.startsWith("/rockclime") && isMobile) {
        setNavbarVisible(false);
      } else {
        setNavbarVisible(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [location]);

  return { isNavbarVisible, setNavbarVisible };
};