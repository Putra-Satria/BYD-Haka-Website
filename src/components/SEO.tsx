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
    const siteTitle = "BYD Haka Auto Career - Lowongan Kerja Otomotif Indonesia";
    const defaultDesc = "Bergabunglah dengan BYD Haka Auto. Temukan lowongan kerja terbaru untuk sales, mekanik, manajer di seluruh dealer BYD Indonesia. Karir otomotif masa depan.";
    const defaultKeywords = "lowongan kerja BYD, karir BYD Haka Auto, rekrutmen otomotif Indonesia, sales mobil listrik, teknisi mobil listrik, karir management trainee";

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
