export const SCHEMA_PROMPT = `
Return ONLY valid JSON.

The JSON MUST follow this schema exactly.

{
  "theme": "startup",

  "sections": [
    {
      "type": "hero",
      "variant": "centered"
    },
    {
      "type": "stats",
      "variant": "cards"
    },
    {
      "type": "features",
      "variant": "grid"
    },
    {
      "type": "benefits",
      "variant": "cards"
    },
    {
      "type": "testimonials",
      "variant": "cards"
    },
    {
      "type": "pricing",
      "variant": "premium"
    },
    {
      "type": "faq",
      "variant": "accordion"
    },
    {
      "type": "footer",
      "variant": "simple"
    }
  ],

  "hero": {
    "badge": "",
    "title": "",
    "highlightWord": "",
    "subtitle": "",
    "primaryCTA": "",
    "secondaryCTA": "",
    "imageStyle": "dashboard",

    "stats": [
      {
        "value": "",
        "label": ""
      },
      {
        "value": "",
        "label": ""
      },
      {
        "value": "",
        "label": ""
      }
    ]
  },

  "stats": [
    {
      "number": "",
      "label": ""
    },
    {
      "number": "",
      "label": ""
    },
    {
      "number": "",
      "label": ""
    }
  ],

  "features": [
    {
      "title": "",
      "description": "",
      "icon": ""
    },
    {
      "title": "",
      "description": "",
      "icon": ""
    },
    {
      "title": "",
      "description": "",
      "icon": ""
    }
  ],

  "benefits": [
    {
      "title": "",
      "description": "",
      "icon": ""
    },
    {
      "title": "",
      "description": "",
      "icon": ""
    },
    {
      "title": "",
      "description": "",
      "icon": ""
    }
  ],

  "testimonials": [
    {
      "name": "",
      "company": "",
      "text": ""
    },
    {
      "name": "",
      "company": "",
      "text": ""
    },
    {
      "name": "",
      "company": "",
      "text": ""
    }
  ],

  "pricing": [
    {
      "name": "",
      "price": "",
      "features": [
        "",
        "",
        ""
      ]
    },
    {
      "name": "",
      "price": "",
      "features": [
        "",
        "",
        ""
      ]
    },
    {
      "name": "",
      "price": "",
      "features": [
        "",
        "",
        ""
      ]
    }
  ],

  "faq": [
    {
      "question": "",
      "answer": ""
    },
    {
      "question": "",
      "answer": ""
    },
    {
      "question": "",
      "answer": ""
    }
  ],

  "footer": {
    "company": "",
    "email": "",
    "copyright": ""
  }
}

Rules:

- Return ONLY valid JSON.
- Never use markdown.
- Never use code blocks.
- Never leave fields empty.
- Generate content that matches the business.
- Icons must be emoji only.
- Each feature must have a unique icon.
- Each benefit must have a unique icon.
- Hero badge must build trust.
- Hero title must be concise and persuasive.
- Hero subtitle must explain the value proposition.
- Hero highlightWord must be one word that already exists inside the title.
- Hero imageStyle must be one of:
  - dashboard
  - analytics
  - product
  - phone
  - website
  - abstract
- Generate exactly 3 hero stats.
- Generate exactly 3 features.
- Generate exactly 3 benefits.
- Generate exactly 3 testimonials.
- Generate exactly 3 pricing plans.
- Generate exactly 3 FAQ items.

Return ONLY valid JSON.
`;