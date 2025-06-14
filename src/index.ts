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
  otherProps?: THTMLScriptElementProps
) => {
  if (otherProps) {
    for (const [attr, value] of Object.entries(otherProps)) {
      script.setAttribute(attr, value as string);
    }
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

  const onReadyRef = React.useRef(onReady);
  const onErrorRef = React.useRef(onError);
  const otherPropsRef = React.useRef(otherProps);

  // Update refs when props change
  React.useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  React.useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  React.useEffect(() => {
    otherPropsRef.current = otherProps;
  }, [otherProps]);

  const handleOnLoad = React.useCallback(() => {
    setState(() => ({ ready: true, error: null }));
    onReadyRef.current?.();
  }, []); // No dependencies needed as refs don't change

  const handleOnError = React.useCallback(
    (error) => {
      setState(() => ({ ready: false, error }));
      onErrorRef.current?.(error);
    },
    [] // No dependencies needed as refs don't change
  );

  const canRunEffect =
    (typeof src === 'string' && src?.length > 0) ||
    (typeof innerText === 'string' && innerText?.length > 0);

  React.useEffect(() => {
    if (canRunEffect && startTrigger && !isLoading.current) {
      const timeoutId = setTimeout(() => {
        try {
          const script = global.document.createElement('script');

          if (innerText && !src) {
            script.innerText = innerText.toString();
          }

          if (src && !innerText) {
            script.src = src.toString();
          }

          script.id = id;

          if (otherPropsRef.current) {
            handleScriptAttributes(script, otherPropsRef.current);
          }

          script.onload = () => handleOnLoad();

          script.onerror = handleOnError;

          global.document[appendTo].appendChild(script);

          isLoading.current = true;

          if (innerText && !src) {
            // If it's an inline script, it's considered "loaded" immediately
            // after being appended.
            handleOnLoad();
          }
        } catch (error) {
          handleOnError(error);
        }
      }, delay);
      return () => clearTimeout(timeoutId);
    }
    // If the effect doesn't run, return a no-op cleanup function or undefined.
    return () => {};
    // isLoading.current is intentionally not in the dep array,
    // as we only want to run this effect once based on startTrigger and canRunEffect.
    // The script loading logic itself should not re-trigger if isLoading changes.
  }, [
    startTrigger,
    id,
    appendTo,
    delay,
    handleOnLoad, // Stable due to useCallback with empty deps
    handleOnError, // Stable due to useCallback with empty deps
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

  // console.log('state', { ready, error }); // Removed console.log

  if (ready && children) {
    return children;
  }

  if (error && fallback) {
    return fallback(error);
  }

  return null;
};
