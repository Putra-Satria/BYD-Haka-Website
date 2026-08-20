import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    name?: string;
    type?: string;
    image?: string;
}

export default function SEO({
    title,
    description,
    keywords,
    name = "BYD Haka Auto",
    type = "website",
    image = "https://lovable.dev/opengraph-image-p98pqg.png" // Replace with actual career image if available
}: SEOProps) {
    const siteTitle = "BYD Haka Auto Careers - Automotive Jobs in Indonesia";
    const defaultDesc = "Join BYD Haka Auto. Discover the latest job openings for sales, mechanics, and managers across BYD dealerships in Indonesia. The future of automotive careers.";
    const defaultKeywords = "BYD job openings, BYD Haka Auto careers, Indonesia automotive recruitment, electric vehicle sales, EV technicians, management trainee careers";

    return (
        <Helmet>
            {/* Standard metadata */}
            <title>{title ? `${title} | ${name}` : siteTitle}</title>
            <meta name="description" content={description || defaultDesc} />
            <meta name="keywords" content={keywords || defaultKeywords} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title ? `${title} | ${name}` : siteTitle} />
            <meta property="og:description" content={description || defaultDesc} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={name} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title ? `${title} | ${name}` : siteTitle} />
            <meta name="twitter:description" content={description || defaultDesc} />
            <meta name="twitter:image" content={image} />

            {/* Canonical - simplified, assumes current URL is canonical */}
            <link rel="canonical" href={window.location.href} />
        </Helmet>
    );
}
