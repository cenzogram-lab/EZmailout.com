import { useEffect } from "react";

/** The filter id `.mascot-3d` references (index.css). */
export const MASCOT_GLOSS_FILTER_ID = "ez-mascot-gloss";

/**
 * The glossy 3D look for Stampy: one hidden SVG holding the lighting filter
 * that `.mascot-3d` applies. Mount it once in the app shell (Layout). While
 * it is mounted it marks <html data-mascot-gloss>, which is what turns the
 * filter on, so a mascot never references a filter that is not there.
 *
 * The filter (sizes are fractions of the mascot's box, so it reads the same
 * from 40 px to 200 px):
 * - a soft diffuse shading of the silhouette (lit from the top left), mixed
 *   at 35 % so white stays white;
 * - a specular sheen on a bump map made from the art's own luminance, so
 *   light parts (cap, ears, face, envelopes) puff up and the ink lines sink.
 */
export function MascotGloss() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-mascot-gloss", "");
    return () => root.removeAttribute("data-mascot-gloss");
  }, []);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter
          id={MASCOT_GLOSS_FILTER_ID}
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
          primitiveUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.035" result="hs" />
          <feDiffuseLighting
            in="hs"
            surfaceScale="3"
            diffuseConstant="1"
            lightingColor="#fff"
            result="d"
          >
            <feDistantLight azimuth="225" elevation="60" />
          </feDiffuseLighting>
          <feComponentTransfer in="d" result="dd">
            <feFuncR type="linear" slope="0.35" intercept="0.65" />
            <feFuncG type="linear" slope="0.35" intercept="0.65" />
            <feFuncB type="linear" slope="0.35" intercept="0.65" />
          </feComponentTransfer>
          <feComposite
            in="SourceGraphic"
            in2="dd"
            operator="arithmetic"
            k1="1"
            result="shaded"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="luminanceToAlpha"
            result="l"
          />
          <feComposite in="l" in2="SourceAlpha" operator="in" result="la" />
          <feGaussianBlur in="la" stdDeviation="0.016" result="h" />
          <feSpecularLighting
            in="h"
            surfaceScale="2.5"
            specularConstant="0.8"
            specularExponent="16"
            lightingColor="#fff"
            result="s"
          >
            <feDistantLight azimuth="225" elevation="48" />
          </feSpecularLighting>
          <feComposite in="s" in2="SourceAlpha" operator="in" result="si" />
          <feComposite
            in="shaded"
            in2="si"
            operator="arithmetic"
            k2="1"
            k3="0.65"
          />
        </filter>
      </defs>
    </svg>
  );
}
