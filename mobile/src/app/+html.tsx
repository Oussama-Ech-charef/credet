import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const responsiveBackground = `
  html, body {
    background-color: #0B0F19;
    color: #F8FAFC;
  }
  body {
    margin: 0;
    overflow-x: hidden;
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html dir="rtl" lang="ar">
      <head>
        <meta charSet="utf-8" />
        <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
        <meta
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
          name="viewport"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
