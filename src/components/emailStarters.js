/* Starting points for the email builder and the blank shape of each block. */

let seq = 0;
/** Client-side key for list rendering; the API ignores it. */
export const withKey = (block) => ({ ...block, _key: `b${Date.now().toString(36)}${(seq++).toString(36)}` });

export const NEW_BLOCK = {
  heading: { type: "heading", text: "A heading", align: "left", size: "lg" },
  text: { type: "text", text: "Write your message here. Use {first_name} to greet each client by name.", align: "left" },
  button: { type: "button", label: "Book now", url: "https://", align: "center" },
  image: { type: "image", src: "", alt: "", link: "" },
  divider: { type: "divider" },
  spacer: { type: "spacer", height: 24 },
};

export const DEFAULT_SETTINGS = {
  brand_color: "#7429c3",
  background: "#f4f1ec",
  content_background: "#ffffff",
  text_color: "#202235",
  font: "sans",
  logo_url: "",
  show_header: true,
  preheader: "",
};

const design = (blocks, settings = {}) => ({
  settings: { ...DEFAULT_SETTINGS, ...settings },
  blocks: blocks.map(withKey),
});

/** Ready-made emails for a salon/clinic; every one can be edited freely. */
export const STARTERS = [
  {
    key: "blank",
    name: "Blank",
    description: "A heading and a paragraph to build on.",
    subject: "News from {business}",
    design: () => design([{ ...NEW_BLOCK.heading, text: "Hello {first_name}" }, NEW_BLOCK.text]),
  },
  {
    key: "offer",
    name: "Special offer",
    description: "Big headline, the offer, and a booking button.",
    subject: "{first_name}, 20% off this week only",
    design: () =>
      design(
        [
          { type: "heading", text: "20% off all hair services", align: "center", size: "lg" },
          { type: "text", text: "Hi {first_name}, treat yourself this week. Book any hair service before Sunday and get 20% off.", align: "center" },
          { type: "button", label: "Book my appointment", url: "https://", align: "center" },
          { type: "spacer", height: 16 },
          { type: "divider" },
          { type: "text", text: "Offer valid at {location} until Sunday. Not combined with other discounts.", align: "center" },
        ],
        { preheader: "This week only: 20% off hair services" },
      ),
  },
  {
    key: "winback",
    name: "We miss you",
    description: "Bring back clients who haven't visited for a while.",
    subject: "We miss you, {first_name}",
    design: () =>
      design(
        [
          { type: "heading", text: "It's been a while, {first_name}", align: "left", size: "lg" },
          { type: "text", text: "We haven't seen you at {business} for some time and we'd love to welcome you back.\n\nAs a thank-you for coming back, your next visit is 15% off.", align: "left" },
          { type: "button", label: "Book a visit", url: "https://", align: "left" },
          { type: "text", text: "See you soon,\nThe {business} team", align: "left" },
        ],
        { preheader: "15% off your next visit", brand_color: "#2f7d5b" },
      ),
  },
  {
    key: "news",
    name: "Announcement",
    description: "New service, new branch, or holiday hours.",
    subject: "Something new at {business}",
    design: () =>
      design(
        [
          { type: "heading", text: "Now open in DHA", align: "center", size: "lg" },
          { type: "text", text: "Our new branch is open with the same team and the same prices. Here are the details:", align: "center" },
          { type: "divider" },
          { type: "heading", text: "Opening hours", align: "left", size: "md" },
          { type: "text", text: "Monday to Saturday: 10am to 9pm\nSunday: 12pm to 8pm", align: "left" },
          { type: "button", label: "Get directions", url: "https://", align: "left" },
        ],
        { brand_color: "#18324a" },
      ),
  },
];

/** Example recipient used wherever an email is previewed. */
export function fillPreview(html, { business = "", location = "" } = {}) {
  return (html || "")
    .replace(/\{first_name\}/g, "Ayesha")
    .replace(/\{name\}/g, "Ayesha Khan")
    .replace(/\{business\}/g, business)
    .replace(/\{location\}/g, location || business)
    .replace(/\{unsubscribe_url\}/g, "#");
}
