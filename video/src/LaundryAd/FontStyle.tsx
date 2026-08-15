import React from "react";
import { staticFile } from "remotion";

export const FontStyle: React.FC = () => (
  <style>{`
    @font-face {
      font-family: "Cairo";
      font-style: normal;
      font-weight: 200 1000;
      font-display: block;
      src: url("${staticFile("fonts/Cairo-Arabic-Variable.woff2")}") format("woff2");
      unicode-range: U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFC;
    }
  `}</style>
);
