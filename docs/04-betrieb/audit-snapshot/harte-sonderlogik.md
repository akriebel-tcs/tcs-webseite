# Harte Sonderlogik (Teil A5)

Funde: 9

| datei | route | page_key | arten | legitim? | empfehlung |
| --- | --- | --- | --- | --- | --- |
| src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx | /gebaeudekommunikation/tuersprechanlagen | gebaeudekommunikation.tuersprechanlagen | hardcodierte_haeufung | ? | Hartcodierte Daten nach cms_section_fields heben. |
| src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx | /tuersprechanlagen | gebaeudekommunikation.tuersprechanlagen | hardcodierte_haeufung | ? | Hartcodierte Daten nach cms_section_fields heben. |
| src/features/kontakt/pages/KontaktPage.tsx | /kontakt | kontakt.root | formular_submit | ja | Als Sonderseite registrieren ODER auf Standardbausteine migrieren. |
| src/features/kontakt/pages/KontaktBcmPage.tsx | /kontakt/bcm | — | formular_submit | ja | Als Sonderseite registrieren ODER auf Standardbausteine migrieren. |
| src/features/produkte/pages/CategoryListPage.tsx | /produkte/zutrittskontrolle | produkte.zutrittskontrolle | lokale_linkmap | ? | Als Sonderseite registrieren ODER auf Standardbausteine migrieren. |
| src/features/produkte/pages/CategoryListPage.tsx | /produkte/eingangsloesungen | produkte.eingangsloesungen | lokale_linkmap | ? | Als Sonderseite registrieren ODER auf Standardbausteine migrieren. |
| src/features/serviceportal/pages/ServiceportalPage.tsx | /serviceportal | serviceportal.login | formular_submit | ? | Als Sonderseite registrieren ODER auf Standardbausteine migrieren. |
| src/features/serviceportal/pages/PasswortVergessenPage.tsx | /serviceportal/passwort-vergessen | serviceportal.passwort-vergessen | formular_submit | ja | Als Sonderseite registrieren ODER auf Standardbausteine migrieren. |
| src/features/serviceportal/pages/RegistrierenPage.tsx | /serviceportal/registrieren | serviceportal.registrieren | formular_submit | ? | Als Sonderseite registrieren ODER auf Standardbausteine migrieren. |

## Export-/Privatserver-Risiko (A7)

| datei | in_code | in_migration | in_audit_script | an_lovable_admin | hinweis |
| --- | --- | --- | --- | --- | --- |
| src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
| src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
| src/features/kontakt/pages/KontaktPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
| src/features/kontakt/pages/KontaktBcmPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
| src/features/produkte/pages/CategoryListPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
| src/features/produkte/pages/CategoryListPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
| src/features/serviceportal/pages/ServiceportalPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
| src/features/serviceportal/pages/PasswortVergessenPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
| src/features/serviceportal/pages/RegistrierenPage.tsx | ja | — | — | — | Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert. |
