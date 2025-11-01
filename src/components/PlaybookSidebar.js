import React from 'react';

export default function PlaybookSidebar({ playbook, dark }) {
  return (
    <aside className={`w-96 p-6 border-l transition-colors duration-500 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          AI Playbook
        </h2>
        <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          Generated insights and recommendations
        </p>
      </div>
      <div className={`prose max-w-none text-sm ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
        {playbook ? (
          <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20 animate-fadeIn">
            <pre className="whitespace-pre-wrap font-sans leading-relaxed">{playbook}</pre>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🎯</div>
            <p className={dark ? 'text-gray-400' : 'text-gray-500'}>
              No playbook selected. Click <span className="font-semibold text-indigo-600">Analyze</span> on a team card.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
