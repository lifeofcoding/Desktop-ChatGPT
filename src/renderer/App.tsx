import React, { useEffect, useRef, useState, HTMLAttributes } from 'react';
import Message from './Message';
import Sources from './Sources';
import './App.css';

const LoadingSpinner = (props: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div {...props}>
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
    </div>
  );
};

const App = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [response, setResponse] = useState('');

  const updateHeight = (withDelay = false) => {
    if (formRef.current && !withDelay) {
      window.electron.ipcRenderer.updateHeight(formRef.current.scrollHeight);
    }

    if (formRef.current && withDelay) {
      const formRefCurrent = formRef.current;
      setTimeout(() => {
        const newScrollHeight = formRefCurrent.scrollHeight;
        window.electron.ipcRenderer.updateHeight(newScrollHeight);
      }, 500);
    }
  };

  const onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setResponse('');
    setSources([]);
    if (inputRef.current?.value) {
      await window.electron.ipcRenderer.submitToChatGPT(inputRef.current.value);
    }

    updateHeight(true);
  };

  const copyText = () => {
    navigator.clipboard.writeText(response || '');
  };

  useEffect(() => {
    const subscription = window.electron.ipcRenderer.on(
      'chatResponse',
      (res) => {
        setIsSearching(false);
        setResponse((prev) => prev + res);

        if (windowRef.current) {
          // smooth scroll to bottom
          windowRef.current.scrollTo({
            top: windowRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
        updateHeight();
      }
    );

    return subscription;
  }, []);

  useEffect(() => {
    const subscription = window.electron.ipcRenderer.on(
      'updateSources',
      (data: string[]) => {
        setSources(data);
        if (windowRef.current) {
          // smooth scroll to bottom
          setTimeout(() => {
            windowRef.current?.scrollTo({
              top: windowRef.current.scrollHeight,
              behavior: 'smooth',
            });
            updateHeight();
          }, 500);
        }
      }
    );

    return subscription;
  }, []);

  useEffect(() => {
    const subscription = window.electron.ipcRenderer.on('blur', () => {
      setResponse('');
      setSources([]);
      updateHeight();
      inputRef.current?.focus();
    });

    return subscription;
  }, []);

  useEffect(() => {
    const subscription = window.electron.ipcRenderer.on('focus', () => {
      setResponse('');
      setSources([]);
      updateHeight();
      inputRef.current?.focus();
    });

    return subscription;
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!document.getElementById('form')?.contains(e.target as Node)) {
        window.electron.ipcRenderer.minimize();
      }
    };

    window.addEventListener('click', fn);

    return () => {
      window.removeEventListener('click', fn);
    };
  }, []);

  const onFocus = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // prev had shadow class shadow-[0_0px_100px_-13px_rgba(0,0,0,0.99)]
  return (
    <div id="app">
      <form onSubmit={onSubmit} id="form" ref={formRef}>
        <div className="bg-[#00000095]  min-h-[200px] w-[70vw] rounded-2xl input-box flex items-center justify-center p-5  border border-gray-700 flex-col">
          <div className="bg-slate-800 inner-input-box flex w-full flex-col p-5 items-center justify-center border-2 rounded-lg border-black">
            <div className="w-full relative">
              <input
                type="search"
                className="rounded-sm bg-slate-600 w-full p-3 hover:bg-slate-500 outline-none border-none text-white"
                ref={inputRef}
                id="searchInput"
                onFocus={onFocus}
              />

              {isSearching ? (
                <>
                  <LoadingSpinner className="absolute right-3 top-3" />
                </>
              ) : null}
            </div>
          </div>

          {isSearching ? (
            <div className="animate-pulse relative w-full h-10 mt-3">
              <div className="h-full bg-gray-700 rounded-lg w-full">&nbsp;</div>
              <span className="sr-only">Loading...</span>
            </div>
          ) : null}
          {response && (
            <div className="relative group w-full mt-3 response-box">
              <button
                type="button"
                onClick={copyText}
                className="bg-slate-400/70 z-10 absolute right-5 bottom-2 hover:bg-slate-400 active:bg-slate-700 active:text-white hidden group-hover:flex rounded text-sm p-2 border border-slate-500"
              >
                Copy
              </button>
              <div
                className="w-full mt-3 bg-white overflow-y-auto max-h-[200px] rounded-lg p-5"
                ref={windowRef}
              >
                <Message message={response} />
                <Sources sources={sources} />
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default App;
