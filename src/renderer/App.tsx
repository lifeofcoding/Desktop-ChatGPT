import React, { useEffect, useRef, useState, HTMLAttributes } from 'react';
import './App.css';

const LoadingSpinner = (props: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div {...props}>
      <svg
        aria-hidden="true"
        className="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
    </div>
  );
};

const App = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [response, setResponse] = useState('');
  const onSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSearching(true);
    if (inputRef.current?.value) {
      window.electron.ipcRenderer.submitToChatGPT(
        inputRef.current.value,
        (res) => {
          setIsSearching(false);
          setResponse(res.choices[0].text);
        }
      );
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(response || '');
  };

  useEffect(() => {
    window.electron.ipcRenderer.onFocusListener(() => {
      setResponse('');
      inputRef.current?.focus();
    });

    window.electron.ipcRenderer.onBlurListener(() => {
      setResponse('');

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    });

    window.addEventListener('click', (e) => {
      if (!document.getElementById('form')?.contains(e.target as Node)) {
        window.electron.ipcRenderer.minimize();
      }
    });
  }, []);
  return (
    <form onSubmit={onSubmit} id="form" ref={formRef}>
      <div className="bg-[#00000095]  min-h-[200px] w-[70vw] mt-6  rounded-2xl input-box flex items-center justify-center p-5 shadow-[0_0px_100px_-13px_rgba(0,0,0,0.99)]">
        <div className="bg-slate-800 inner-input-box flex w-full flex-col p-5 items-center justify-center border-2 rounded-sm border-black">
          <div className="w-full relative">
            <input
              type="text"
              className="rounded-sm bg-slate-600 w-full p-3 hover:bg-slate-500 outline-none border-none"
              ref={inputRef}
              id="searchInput"
            />
            {isSearching ? (
              <>
                <LoadingSpinner className="absolute right-0 top-1" />
                <div className="animate-pulse relative">
                  <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full mb-4 absolute top-[-0.6em]">
                    &nbsp;
                  </div>
                  <span className="sr-only">Loading...</span>
                </div>
              </>
            ) : null}
          </div>
          {response && (
            <div className="relative group w-full">
              <button
                type="button"
                onClick={copyText}
                className="bg-slate-200 absolute right-1 top-4 hover:bg-slate-400 hidden group-hover:flex rounded text-sm p-1"
              >
                Copy
              </button>
              <div className="w-full mt-3 bg-white p-2 overflow-y-scroll max-h-[200px]">
                {response}
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default App;
