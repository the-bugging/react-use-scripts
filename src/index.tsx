import * as React from 'react';

type TScriptLoader = {
  onCreate?: () => null;
  onLoad?: () => null;
  onError?: (e: any) => never;
  delayMs?: number;
  htmlPart?: string;
  src: string;
  otherProps?: Record<string, unknown>;
};

type TAppendScript = {
  id: string;
  scriptText: string;
  optionalCallback?: () => null;
  htmlPart: string;
  otherProps?: Record<string, unknown>;
};

type TUseScript = {
  ScriptLoader: {
    ({
      onCreate,
      onLoad,
      onError,
      delayMs,
      htmlPart,
      src,
      ...otherProps
    }: TScriptLoader): null;
  };
  appendScript: {
    ({
      id,
      scriptText,
      optionalCallback,
      htmlPart,
      otherProps,
    }: TAppendScript): boolean;
  };
};

const handleScriptAttributes = (
  script: HTMLScriptElement,
  otherProps: Record<string, unknown>
) => {
  for (const [attr, value] of Object.entries(otherProps)) {
    script.setAttribute(attr, value as string);
  }
};

const ScriptLoader = ({
  onCreate = () => null,
  onLoad = () => null,
  onError = (e) => {
    throw new URIError(`The script ${e.target.src} is not accessible`);
  },
  delayMs = 0,
  htmlPart = 'head',
  src,
  ...otherProps
}: TScriptLoader): null => {
  const appendScript = React.useCallback(() => {
    const script = global.document.createElement('script');

    script.src = src;

    if (otherProps) {
      handleScriptAttributes(script, otherProps as Record<string, unknown>);
    }

    script.onload = onLoad;
    script.onerror = onError;

    global.document[htmlPart].appendChild(script);

    onCreate();
  }, [onCreate, onError, onLoad, otherProps, src, htmlPart]);

  React.useEffect(() => {
    const timeout = setTimeout(() => appendScript(), delayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [appendScript, delayMs]);

  return null;
};

const appendScript = ({
  id,
  scriptText,
  optionalCallback = () => null,
  htmlPart = 'head',
  otherProps = {},
}: TAppendScript): boolean => {
  try {
    const existentScript = global.document.getElementById(
      id
    ) as HTMLScriptElement;
    const script = existentScript || global.document.createElement('script');

    script.id = id;
    script.innerText = scriptText.toString();

    handleScriptAttributes(script, otherProps);

    global.document[htmlPart].appendChild(script);

    optionalCallback();

    return true;
  } catch (error) {
    console.error('Must be a string!', error);

    return false;
  }
};

export function useScript(): TUseScript {
  return React.useMemo(() => ({ ScriptLoader, appendScript }), []);
}
