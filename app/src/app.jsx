import React, { useEffect, useRef, useState } from "react";

const App = () => {
  const inputRef = useRef();
  const [response, setResponse] = useState(null);
  const onSubmit = (e) => {
    e.preventDefault();
    if (inputRef.current.value) {
      window.electron.submitToChatGPT(inputRef.current.value, (response) => {
        console.log(response); // 'something'
        setResponse(response.choices[0].text);
      });
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(response);
  };

  useEffect(() => {
    window.electron.onFocusListener(() => {
      setResponse(null);
      inputRef.current.focus();
    });

    window.electron.onBlurListener(() => {
      setResponse(null);
      inputRef.current.value = "";
    });

    window.addEventListener("click", function (e) {
      if (!document.getElementById("form").contains(e.target)) {
        window.electron.minimize();
      }
    });
  }, []);
  return (
    <form onSubmit={onSubmit} id="form">
      <div className="bg-[#00000095]  min-h-[200px] w-[70vw] mt-6  rounded-2xl input-box flex items-center justify-center p-5 shadow-[0_0px_100px_-13px_rgba(0,0,0,0.99)]">
        <div className="bg-slate-800 inner-input-box flex w-full flex-col p-5 items-center justify-center border-2 rounded-sm border-black">
          <div className="w-full">
            <input
              type="text"
              className="rounded-sm bg-slate-600 w-full p-3 hover:bg-slate-500 outline-none border-none"
              ref={inputRef}
              autofocus
            />
          </div>
          {response && (
            <div className="relative group w-full">
              <button
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
