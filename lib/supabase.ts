import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tdwoqankjznioxnupsvn.supabase.co";
const anahtar =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_wFIqSF7Jg2pW2Wu_n_od9g_DrHCTtRj";

export const supabase = createClient(url, anahtar);
