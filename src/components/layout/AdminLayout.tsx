import { ThemedLayoutV2, ThemedHeaderV2 } from "@refinedev/antd";
import type { PropsWithChildren } from "react";

/**
 * Custom ThemedHeader yang tidak render tombol logout.
 * Logout tetap bisa dari URL /logout manual kalau perlu.
 */
const HeaderWithoutLogout = () => {
  return (
    <ThemedHeaderV2
      sticky
      // Kosongkan render default supaya tidak ada avatar/logout
    />
  );
};

export const AdminLayout = ({ children }: PropsWithChildren) => (
  <ThemedLayoutV2 Header={HeaderWithoutLogout}>{children}</ThemedLayoutV2>
);
