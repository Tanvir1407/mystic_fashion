"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePage } from "../../actions";
import { Save, ArrowLeft, Info } from "lucide-react";
import Link from "next/link";

interface EditPageClientProps {
  slug: string;
  initialData: {
    title: string;
    content: string;
  };
}

export default function EditPageClient({ slug, initialData }: EditPageClientProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData.title);
  const [content, setContent] = useState(initialData.content);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await updatePage(slug, { title, content });
      if (res.success) {
        setMessage({ type: "success", text: "Page updated successfully!" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: "Failed to update page." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/pages"
            className="text-sm text-slate-500 hover:text-maroon flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pages
          </Link>
          <h1 className="text-2xl font-bold  text-slate-900">Edit {initialData.title}</h1>
          <p className="text-slate-500 text-sm mt-1">Customize the content and layout of this static page.</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-white bg-slate-900 px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-maroon/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
          }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.type === "success" ? "bg-green-100" : "bg-red-100"
            }`}>
            {message.type === "success" ? "✓" : "!"}
          </div>
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Page Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter page title"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-maroon/20 focus:border-maroon outline-none transition-all font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Page Content (HTML/Text)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your page content here..."
                rows={20}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-maroon/20 focus:border-maroon outline-none transition-all font-mono text-sm leading-relaxed text-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-4">
              <Info className="w-5 h-5 text-maroon" />
              Page Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Slug</span>
                <span className="font-mono text-slate-900 underline">/{slug}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="text-green-600 font-semibold">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Visibility</span>
                <span className="text-slate-900">Public</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-300 p-6 rounded-xl shadow-lg border border-slate-800">
            <h3 className="text-white font-bold mb-3">Classic Modern Editor</h3>
            <p className="text-sm leading-relaxed opacity-80">
              Input raw text or HTML here. Our renderer automatically applies premium typography and layout to keep your site looking consistent.
            </p>
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-xs">
              <p className="font-semibold text-white mb-2 uppercase tracking-wider">Example Snippets:</p>
              <code className="block text-maroon-light opacity-70 mb-2">&lt;h3 class="premium-heading"&gt;Our Success&lt;/h3&gt;</code>
              <code className="block text-slate-400">&lt;p&gt;Start writing here...&lt;/p&gt;</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
