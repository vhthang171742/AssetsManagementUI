import React from "react";
import PortalLayout from "layouts/portal";
import ProfileOverview from "views/admin/profile";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function ProfilePage() {
  return (
    <PortalLayout title="Profile" titleKey={K.PAGE_PROFILE}>
      <ProfileOverview />
    </PortalLayout>
  );
}
