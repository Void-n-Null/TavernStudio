---
alwaysApply: false
---

I remember that TavernStudio is LOCAL FIRST! That mean's the "official" or "expected" use case is for the user to run backend on their own computer and then simply use the front end as their interface. This also explains why the architecture is so focused on Client Authoritative patterns. It doesn't matter if the browser decides something about what the server should do / store when both are really the property of the individual user who is running the instance. The only "security" needed is with API keys, which we simply just... don't store in plain text? Pretty reasonable to me. Considering even the idea of "I'm going to look into the TavernStudio SQLite Databse to try to sniff out some API keys" is already pretty niche of an attack vector.