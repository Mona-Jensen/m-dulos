const axios = require('axios');
const xml2js = require('xml2js');

exports.handler = async function(event, context) {
    try {
        // Obtenemos fecha actual para construir el prefijo de S3
        const now = new Date();
        const year = now.getUTCFullYear();
        const start = new Date(Date.UTC(year, 0, 0));
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay).toString().padStart(3, '0');
        const hour = now.getUTCHours().toString().padStart(2, '0');

        // URL del bucket público de NOAA para GOES-16 (ABI Level 2 Cloud and Moisture Imagery Full Disk)
        const bucketUrl = `https://noaa-goes16.s3.amazonaws.com/?prefix=ABI-L2-CMIPF/${year}/${dayOfYear}/${hour}/`;
        
        const response = await axios.get(bucketUrl);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        const contents = result.ListBucketResult.Contents;
        let latestFile = "Buscando...";
        
        if (contents && contents.length > 0) {
            // El último archivo en la lista es el más reciente de esa hora
            latestFile = contents[contents.length - 1].Key[0];
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: "success",
                bucket: "noaa-goes16",
                path: bucketUrl,
                latest: latestFile,
                timestamp: now.toISOString()
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ status: "error", message: error.message })
        };
    }
};
