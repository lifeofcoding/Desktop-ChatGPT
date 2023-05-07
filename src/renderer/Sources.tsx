import React from 'react';

const Sources = ({ sources }: { sources: string[] }) => {
  if (!sources.length) {
    return null;
  }

  const getHost = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.host;
    } catch (e) {
      return url.substring(0, 20);
    }
  };

  const onClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();
    window.open(e.currentTarget.href, '_blank');
  };

  return (
    <div className="flex flex-col w-full mt-3">
      <p className="font-semibold">Sources:</p>

      <div className="flex flex-row w-full overflow-y-auto gap-2 mt-2">
        {sources.map((source, index) => (
          <a
            className="flex rounded-md p-1 bg-blue-600 text-white text-sm"
            key={index.toString()}
            href={source}
            onClick={onClick}
          >
            {getHost(source)}
          </a>
        ))}
      </div>
    </div>
  );
};

export default Sources;
