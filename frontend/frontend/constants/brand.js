// constants/brand.js
// -----------------------------------------------------------------------------
// Real organization details for Al-Hidaya Center (Latham, NY), used across the
// app so it feels like their own product. Source: https://www.al-hidaya.org
//
// Centralised here so contact info / links live in ONE place. Image assets are
// downloaded into assets/branding so they render reliably on iOS/Android/Web.
// -----------------------------------------------------------------------------

export const brand = {
  name: 'Sabeel 114',
  shortName: 'Sabeel 114',
  tagline: 'Islamic Community',
  portal: 'School Portal',

  // Contact
  address: '322 Troy Schenectady Rd, Latham, NY 12110',
  phone: '518-608-1255',
  email: 'office@al-hidaya.org',
  website: 'https://www.al-hidaya.org',

  // Social
  social: {
    facebook: 'https://www.facebook.com/AlHidayaCenterLatham',
    instagram: 'https://www.instagram.com/al_hidaya_center/',
    youtube: 'https://www.youtube.com/channel/UCdwICxZYB8zQ6xrJZ0OS1CQ',
    whatsapp: 'https://whatsapp.com/channel/0029Vb7ow6ZAYlUI28z4XN2X',
  },
};

// Local image assets (require() so Metro bundles them for every platform).
export const brandImages = {
  logo: require('../assets/branding/logo.png'),
  masjid: require('../assets/branding/masjid.png'),
};

export default brand;
