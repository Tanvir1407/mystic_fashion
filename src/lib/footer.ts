import { prisma } from "./prisma";

export interface FooterData {
  aboutText: string;
  facebookUrl: string;
  instagramUrl: string;
  whatsappPhone: string | null;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  companyLinks: { label: string; url: string }[];
}

export async function getFooterData(): Promise<FooterData> {
  const config = await prisma.footerConfig.findUnique({
    where: { id: "default" },
  });

  const defaultData: FooterData = {
    aboutText: "Premium authentic jerseys and sportswear. Crafted for those who live and breathe the game.",
    facebookUrl: "#",
    instagramUrl: "#",
    whatsappPhone: "",
    contactEmail: "hello@mysticfashion.com",
    contactPhone: "01700-MYSTIC",
    contactAddress: "Dhaka, Bangladesh",
    companyLinks: [
      { label: "About", url: "/about" },
      { label: "Contact", url: "/contact" },
      { label: "FAQ", url: "/faq" }
    ]
  };

  if (!config) return defaultData;

  return {
    aboutText: config.aboutText,
    facebookUrl: config.facebookUrl,
    instagramUrl: config.instagramUrl,
    whatsappPhone: config.whatsappPhone,
    contactEmail: config.contactEmail,
    contactPhone: config.contactPhone,
    contactAddress: config.contactAddress,
    companyLinks: (config.companyLinks as any[]) || defaultData.companyLinks,
  };
}
