export function JsEnableScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: "document.documentElement.setAttribute('data-js','');",
      }}
    />
  );
}
