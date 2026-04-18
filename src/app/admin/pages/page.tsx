import Link from "next/link";
import prisma from "@/lib/prisma";
import { ChevronRight, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const SLUGS = [
  { slug: "about", title: "About Us" },
  { slug: "contact", title: "Contact Us" },
  { slug: "faq", title: "FAQ" },
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "terms", title: "Terms & Conditions" },
];

export default async function AdminPages() {
  const pages = await prisma.page.findMany();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Pages</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the content of your store's static pages.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {SLUGS.map((item) => {
            const pageData = pages.find(p => p.slug === item.slug);
            const isCreated = !!pageData;
            
            return (
              <Link
                key={item.slug}
                href={`/admin/pages/${item.slug}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-maroon/10 group-hover:text-maroon transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono">/{item.slug}</span>
                      {isCreated ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                          Needs Content
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span className="text-xs font-medium">Edit Content</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
