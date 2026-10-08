# Platform icons and education years

Around the web automatically identifies GitHub, Facebook, Instagram, YouTube, X/Twitter, TikTok and LinkedIn from a validated URL hostname. Other websites get a globe. Users keep control of their link label. No logo upload or external favicon service is used. Matching includes platform subdomains but rejects misleading suffixes such as github.com.example.com. A logo identifies a platform; it does not verify an account or endorse a link.

Education uses optional start/end year dropdowns, covering 1900 through ten years beyond the current year. Existing saved years outside that range remain selectable. Blank end means ongoing or not specified. End year cannot precede start year. Experience date fields are unchanged.

No migration is needed. The existing date columns remain compatible: education displays only the year, and saving writes January 1 as a storage placeholder for that year. Existing years are retained; previously saved education months/days are discarded on the next portfolio save. The placeholder is not an actual attendance date.

Validation: 88 interface tests passed, TypeScript passed, production build passed. Build retains a bundle-size warning. Physical-device checks are still recommended after deployment.
