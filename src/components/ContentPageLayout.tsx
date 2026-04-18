import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import { getFooterData } from "@/lib/footer";

interface ContentPageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default async function ContentPageLayout({ children, title }: ContentPageLayoutProps) {
  const footerData = await getFooterData();

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      
      {/* Page Header */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-0 text-center">
          <h1 className="text-4xl md:text-5xl font-black font-serif italic text-slate-900 tracking-tighter">
            {title}
          </h1>
          <div className="w-20 h-1 bg-maroon mx-auto mt-6"></div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto py-16 md:py-24 px-4 md:px-0">
        <div className="max-w-4xl mx-auto prose prose-slate prose-lg md:prose-xl dark:prose-invert">
          {children}
        </div>
      </section>

      <Footer config={footerData} />
      <SidebarCart />
    </main>
  );
}
