import React from "react";

export const metadata = {
  title: "Sanskrit Sarthi",
  description: "Sanskrit-only AI doubt solving for every learner."
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body style={{margin:0,fontFamily:"system-ui, sans-serif",background:"#fffdf7",color:"#18372e"}}>{children}</body></html>;
}
