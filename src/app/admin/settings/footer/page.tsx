import { getFooterConfig } from "./actions";
import FooterSettingsClient from "./FooterSettingsClient";

export default async function FooterSettingsPage() {
  const initialData = await getFooterConfig();
  
  return <FooterSettingsClient initialData={initialData} />;
}
