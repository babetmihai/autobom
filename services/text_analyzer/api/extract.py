import json
import logging
import os
import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
EXTRACT_TIMEOUT_MS = int(os.getenv("EXTRACT_TIMEOUT_MS", "120000"))
FETCH_TIMEOUT_MS = int(os.getenv("FETCH_TIMEOUT_MS", "30000"))
MAX_TEXT_CHARS = int(os.getenv("EXTRACT_MAX_TEXT_CHARS", "6000"))
MAX_IMAGE_CANDIDATES = 12

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)


def _parse_json_response(raw):
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _absolute_url(base, value):
    if not value:
        return None
    return urljoin(base, value.strip())


def _clean_text(value):
    if not value:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None


def _description_value(value):
    if isinstance(value, list):
        parts = [_description_value(item) for item in value]
        return _clean_text(" ".join(part for part in parts if part))
    if isinstance(value, dict):
        return _description_value(value.get("text") or value.get("@value") or value.get("description"))
    text = _clean_text(value)
    if text and "<" in text:
        text = _clean_text(BeautifulSoup(text, "html.parser").get_text(" ", strip=True))
    return text


def _is_probably_image(url):
    if not url:
        return False
    lower = url.lower().split("?")[0]
    if any(token in lower for token in ("logo", "icon", "sprite", "pixel", "1x1", "favicon")):
        return False
    return True


def _json_ld_products(soup):
    products = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = tag.string or tag.get_text() or ""
        if not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            types = item.get("@type")
            type_list = types if isinstance(types, list) else [types]
            type_names = {str(t).lower() for t in type_list if t}
            if "product" in type_names:
                products.append(item)
            graph = item.get("@graph")
            if isinstance(graph, list):
                for node in graph:
                    if not isinstance(node, dict):
                        continue
                    node_types = node.get("@type")
                    node_list = node_types if isinstance(node_types, list) else [node_types]
                    if "product" in {str(t).lower() for t in node_list if t}:
                        products.append(node)
    return products


def _image_from_value(value, base_url):
    if isinstance(value, str):
        return _absolute_url(base_url, value)
    if isinstance(value, list) and value:
        return _image_from_value(value[0], base_url)
    if isinstance(value, dict):
        return _absolute_url(base_url, value.get("url") or value.get("contentUrl"))
    return None


def _price_from_offers(offers):
    if isinstance(offers, list) and offers:
        return _price_from_offers(offers[0])
    if not isinstance(offers, dict):
        return None, None
    price = offers.get("price") or offers.get("lowPrice")
    currency = offers.get("priceCurrency")
    return _clean_text(price), _clean_text(currency)


def _from_json_ld(products, base_url):
    if not products:
        return {}
    product = products[0]
    price, currency = _price_from_offers(product.get("offers"))
    return {
        "name": _clean_text(product.get("name")),
        "description": _description_value(product.get("description")),
        "sku": _clean_text(product.get("sku") or product.get("mpn")),
        "price": price,
        "currency": currency,
        "imageUrl": _image_from_value(product.get("image"), base_url)
    }


def _meta_content(soup, *keys):
    for key in keys:
        tag = soup.find("meta", attrs={"property": key}) or soup.find("meta", attrs={"name": key})
        if tag and tag.get("content"):
            return _clean_text(tag["content"])
    return None


def _from_open_graph(soup, base_url):
    image = _meta_content(soup, "og:image", "twitter:image", "twitter:image:src")
    return {
        "name": _meta_content(soup, "og:title", "twitter:title"),
        "description": _description_value(
            _meta_content(soup, "og:description", "twitter:description", "description")
        ),
        "price": _meta_content(soup, "product:price:amount", "og:price:amount"),
        "currency": _meta_content(soup, "product:price:currency", "og:price:currency"),
        "imageUrl": _absolute_url(base_url, image) if image else None
    }


def _from_dom(soup):
    tag = soup.find(attrs={"itemprop": "description"})
    if not tag:
        tag = soup.select_one(
            "#product-description, .product-description, .product__description, "
            "[data-product-description], .product-single__description"
        )
    if not tag:
        return {}
    return {"description": _description_value(tag.get_text(" ", strip=True))}


def _candidate_images(soup, base_url):
    seen = set()
    images = []
    for tag in soup.find_all(["meta", "img"]):
        if tag.name == "meta":
            prop = (tag.get("property") or tag.get("name") or "").lower()
            if "image" not in prop:
                continue
            value = tag.get("content")
        else:
            value = tag.get("src") or tag.get("data-src") or tag.get("data-original")
        url = _absolute_url(base_url, value)
        if not url or url in seen or not _is_probably_image(url):
            continue
        seen.add(url)
        images.append(url)
        if len(images) >= MAX_IMAGE_CANDIDATES:
            return images
    return images


def _page_text(soup):
    for tag in soup(["script", "style", "noscript", "svg", "nav", "footer", "header"]):
        tag.decompose()
    title = _clean_text(soup.title.get_text() if soup.title else None)
    chunks = []
    if title:
        chunks.append(title)
    main = soup.find("main") or soup.find("article") or soup.body
    if main:
        chunks.append(_clean_text(main.get_text(" ", strip=True)))
    text = "\n".join(chunk for chunk in chunks if chunk)
    return text[:MAX_TEXT_CHARS]


def _merge_fields(*sources):
    result = {}
    for source in sources:
        if not source:
            continue
        for key, value in source.items():
            if value and not result.get(key):
                result[key] = value
    return result


def _needs_llm(fields):
    return not fields.get("name") or not fields.get("imageUrl")


def _build_prompt(url, page_text, candidates, seed):
    seed_json = json.dumps(seed, ensure_ascii=True)
    images_json = json.dumps(candidates, ensure_ascii=True)
    return f"""You extract furniture/product fields from a store product page.

Page URL: {url}

Known fields (may be incomplete):
{seed_json}

Candidate image URLs (pick the main product photo, not logos):
{images_json}

Page text:
{page_text}

Return JSON only with these keys:
{{"name": string|null, "description": string|null, "price": string|null, "currency": string|null, "sku": string|null, "imageUrl": string|null}}

Rules:
- name is the product title
- description is the product blurb/details from the page (not shipping, returns, or cookie text); keep it concise
- imageUrl must be one of the candidate URLs when possible
- price is numeric string without currency symbol when possible
- use null when unknown
"""


def _ollama_extract(url, page_text, candidates, seed):
    prompt = _build_prompt(url, page_text, candidates, seed)
    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        },
        timeout=EXTRACT_TIMEOUT_MS / 1000
    )
    response.raise_for_status()
    body = response.json()
    parsed = _parse_json_response(body.get("response", "{}"))
    if not isinstance(parsed, dict):
        return {}
    image_url = _clean_text(parsed.get("imageUrl"))
    if image_url and image_url not in candidates and candidates:
        image_url = candidates[0]
    return {
        "name": _clean_text(parsed.get("name")),
        "description": _description_value(parsed.get("description")),
        "price": _clean_text(parsed.get("price")),
        "currency": _clean_text(parsed.get("currency")),
        "sku": _clean_text(parsed.get("sku")),
        "imageUrl": image_url
    }


def extract_product(url):
    page_url = (url or "").strip()
    if not page_url:
        raise ValueError("url is required")

    response = requests.get(
        page_url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
        timeout=FETCH_TIMEOUT_MS / 1000,
        allow_redirects=True
    )
    response.raise_for_status()
    final_url = str(response.url)
    soup = BeautifulSoup(response.text, "html.parser")

    json_ld = _from_json_ld(_json_ld_products(soup), final_url)
    open_graph = _from_open_graph(soup, final_url)
    dom = _from_dom(soup)
    seed = _merge_fields(json_ld, open_graph, dom)
    candidates = _candidate_images(soup, final_url)
    if seed.get("imageUrl") and seed["imageUrl"] not in candidates:
        candidates = [seed["imageUrl"], *candidates][:MAX_IMAGE_CANDIDATES]

    llm_fields = {}
    needs_core = _needs_llm(seed)
    needs_description = not seed.get("description")
    if needs_core or needs_description:
        page_text = _page_text(soup)
        if needs_core:
            llm_fields = _ollama_extract(final_url, page_text, candidates, seed)
        else:
            try:
                llm_fields = _ollama_extract(final_url, page_text, candidates, seed)
            except Exception as exc:
                logger.warning("Optional description extract failed: %s", exc)

    fields = _merge_fields(seed, llm_fields, {
        "productUrl": final_url
    })

    if not fields.get("imageUrl") and candidates:
        fields["imageUrl"] = candidates[0]

    if not fields.get("name"):
        raise ValueError("Could not extract product name from URL")
    if not fields.get("imageUrl"):
        raise ValueError("Could not extract product image from URL")

    return {
        "name": fields.get("name"),
        "description": fields.get("description"),
        "price": fields.get("price"),
        "currency": fields.get("currency"),
        "sku": fields.get("sku"),
        "imageUrl": fields.get("imageUrl"),
        "productUrl": fields.get("productUrl") or final_url
    }
