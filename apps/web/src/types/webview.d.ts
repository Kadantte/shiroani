/**
 * Electron <webview> tag JSX declarations.
 *
 * React does not include webview in its built-in HTML element types.
 * This declaration makes <webview> valid in TSX and allows setting
 * Electron-specific attributes.
 */
declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      partition?: string;
      allowpopups?: string;
      preload?: string;
      httpreferrer?: string;
      useragent?: string;
      disablewebsecurity?: string;
      nodeintegration?: string;
      nodeintegrationinsubframes?: string;
      webpreferences?: string;
      enableblinkfeatures?: string;
      disableblinkfeatures?: string;
    };
  }
}
