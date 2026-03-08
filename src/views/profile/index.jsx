import React from "react";
import PortalLayout from "layouts/portal";
import ProfileOverview from "views/admin/profile";

export default function ProfilePage() {
  return (
    <PortalLayout title="Profile">
      <ProfileOverview />
    </PortalLayout>
  );
}
