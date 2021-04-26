import * as React from 'react';

type THTMLScriptElementProps = Record<string, keyof HTMLScriptElement>;

export interface IUseScript {
  ready: boolean;
  error: null | Event | string;
}

export interface IScriptProps {
  src?: string;
  innerText?: string;
  onReady?: () => void;
  onError?: (error: string | Event) => void;
  otherProps?: THTMLScriptElementProps;
  startTrigger?: boolean;
  id?: string;
  appendTo?: string;
  delay?: number;
}

export interface IScriptLoaderProps extends IScriptProps {
  children?:
    | JSX.Element
    | JSX.Element[]
    | string
    | string[]
    | number
    | number[];
  fallback?: (error: string | Event) => JSX.Element;
}

const handleScriptAttributes = (
  script: HTMLScriptElement,
  otherProps: THTMLScriptElementProps
) => {
  for (const [attr, value] of Object.entries(otherProps)) {
    script.setAttribute(attr, value as string);
  }
};

export default function useScript({
  src,
  innerText,
  onReady,
  onError,
  otherProps,
  startTrigger = true,
  id = `react-use-script-${Math.random()}`,
  appendTo = 'head',
  delay = 0,
}: IScriptProps): IUseScript {
  const isLoading = React.useRef(false);
  const [state, setState] = React.useState<IUseScript>({
    ready: false,
    error: null,
  });
  const handleOnLoad = React.useCallback(() => {
    setState(() => ({ ready: true, error: null }));
    onReady?.();
  }, [onReady]);
  const handleOnError = React.useCallback(
    (error) => {
      setState(() => ({ ready: false, error }));
      onError?.(error);
    },
    [onError]
  );
  const canRunEffect =
    (typeof src === 'string' && src?.length > 0) ||
    (typeof innerText === 'string' && innerText?.length > 0);

  React.useEffect(() => {
    if (canRunEffect && startTrigger && !isLoading.current) {
      setTimeout(() => {
        try {
          const script = global.document.createElement('script');

          if (innerText && !src) {
            script.innerText = innerText.toString();
          }

          if (src && !innerText) {
            script.src = src.toString();
          }

          script.id = id;

          if (otherProps) {
            handleScriptAttributes(script, otherProps);
          }

          script.onload = () => handleOnLoad();

          script.onerror = handleOnError;

          global.document[appendTo].appendChild(script);

          isLoading.current = true;

          if (innerText && !src) {
            handleOnLoad();
          }
        } catch (error) {
          handleOnError(error);
        }
      }, delay);
    }
  }, [
    onReady,
    onError,
    otherProps,
    startTrigger,
    id,
    appendTo,
    delay,
    handleOnLoad,
    handleOnError,
    canRunEffect,
    innerText,
    src,
  ]);

  return state;
}

export const ScriptLoader = ({
  children,
  fallback,
  src,
  innerText,
  onReady,
  onError,
  otherProps,
  startTrigger = true,
  id = `react-use-script-${new Date().toISOString()}`,
  appendTo = 'head',
  delay = 0,
}: IScriptLoaderProps):
  | string
  | number
  | JSX.Element
  | JSX.Element[]
  | string[]
  | number[]
  | null => {
  const { ready, error } = useScript({
    src,
    innerText,
    onReady,
    onError,
    startTrigger,
    id,
    appendTo,
    delay,
    otherProps,
  });

  console.log('state', { ready, error });

  if (ready && children) {
    return children;
  }

  if (error && fallback) {
    return fallback(error);
  }

  return null;
};
