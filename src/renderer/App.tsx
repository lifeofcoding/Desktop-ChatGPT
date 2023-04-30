import React, { useEffect, useRef, useState, HTMLAttributes } from 'react';
import Message from './Message';
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
  const [isSearching, setIsSearching] = useState(false);
  const [response, setResponse] = useState('');
  const onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setResponse('');
    if (inputRef.current?.value) {
      await window.electron.ipcRenderer.submitToChatGPT(inputRef.current.value);
    }
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
      }
    );

    return subscription;
  }, []);

  useEffect(() => {
    const subscription = window.electron.ipcRenderer.on('blur', () => {
      setResponse('');
      inputRef.current?.focus();
    });

    return subscription;
  }, []);

  useEffect(() => {
    const subscription = window.electron.ipcRenderer.on('focus', () => {
      setResponse('');
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

  return (
    <form onSubmit={onSubmit} id="form" ref={formRef}>
      <div className="bg-[#00000095]  min-h-[200px] w-[70vw] mt-6  rounded-2xl input-box flex items-center justify-center p-5 shadow-[0_0px_100px_-13px_rgba(0,0,0,0.99)] flex-col">
        <div className="bg-slate-800 inner-input-box flex w-full flex-col p-5 items-center justify-center border-2 rounded-lg border-black">
          <div className="w-full relative">
            <input
              type="text"
              className="rounded-sm bg-slate-600 w-full p-3 hover:bg-slate-500 outline-none border-none text-white"
              ref={inputRef}
              id="searchInput"
              onFocus={onFocus}
            />
            {isSearching ? (
              <>
                <LoadingSpinner className="absolute right-1 top-2" />
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
              className="bg-slate-200 absolute right-1 top-4 hover:bg-slate-400 active:bg-slate-700 active:text-white hidden group-hover:flex rounded text-sm p-2 border border-slate-500"
            >
              Copy
            </button>
            <div
              className="w-full mt-3 bg-white overflow-y-auto max-h-[200px] rounded-lg p-5"
              ref={windowRef}
            >
              <Message message={response} />
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default App;
