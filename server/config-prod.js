// Dev config
module.exports = {
  AWS: {
    region: 'us-west-2',
    bucket: 'com.copyraptor.content'
  },

  USERS: {
    "firstorder.com.au":    { password: 'gK9XfJAHBq76m5Q', email: 'alex@firstorder.com.au', name: "Alex North" },
    "helixta.com.au":       { password: 't7B5pc3kfhMVeGw', email: 'franko@helixta.com.au', name: "Franko" },

    // Alpha users
    "chw.org.sg":           { password: 'dHQb5TcGX6aPrrJ', email: 'donovan.lo@chw.org.sg', name: "Donovan Lo" },
    "legalomegle.tk":       { password: '795x2s9UZG4z8tt', email: 'legalomegle@gmail.com' },
    "karloliver.com":       { password: 'Cq5P2jW9H57Y34q', email: 'knaoliver@gmail.com', name: "Karl" },
    "growthwebs.com":       { password: 'v33j58t57sAy99W', email: 'andy@andy.mu', name: "Andy Murphy" },
    "vinus.net.au":         { password: 'hAz74hYXFeCG4dY', email: 'alex@getvinus.com', name: "Alex Martell" },

    // https://strongpasswordgenerator.com/
    "example":              { password: 'FIXME', email: 'example@example.com', name: "name" },

    // Internal
    copyraptor: { password: '8yUsdGPCuWUYBqG' }
  },

  // Session cookie encryption secret
  APP_SECRET: 'xMrVg4uLEKyGd4vdaXQV'
};
