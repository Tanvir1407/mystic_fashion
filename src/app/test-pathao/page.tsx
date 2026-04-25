'use client';

import { useState } from 'react';
import { getTokenForTest } from '@/app/actions/pathao';

export default function PathaoTestPage() {
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);

    const handleFetchToken = async () => {
        setLoading(true);
        setResponse(null); // আগের রেসপন্স ক্লিয়ার করে দিচ্ছি

        const result = await getTokenForTest();

        setResponse(result);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h1 className="text-2xl font-bold mb-2 text-gray-800">Pathao API Tester</h1>
                <p className="text-sm text-gray-500 mb-6">Click the button below to generate a new access token from the Sandbox environment.</p>

                <button
                    onClick={handleFetchToken}
                    disabled={loading}
                    className={`px-6 py-2 rounded-md text-white font-medium transition-all ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {loading ? 'Generating Token...' : 'Generate Access Token'}
                </button>

                {response && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">API Response:</h3>
                        <div className={`p-4 rounded-md overflow-auto text-sm ${response.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <pre className="text-gray-800 whitespace-pre-wrap">
                                {JSON.stringify(response, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}