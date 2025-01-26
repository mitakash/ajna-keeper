export async function getPrice(query: string, apiKey: string) {
  const url = 'https://api.coingecko.com/api/v3/simple/' + query;
  const options = {
    method: 'GET',
    headers: {accept: 'application/json', 'x-cg-demo-api-key': apiKey}
  };

  try {
    const res = await fetch(url, options)
    const resJson = await res.json()
    return Object.values(Object.values(resJson)[0])[0]
  } catch (error) {
    console.error('Error fetching price from CoinGecko:', error)
  }
}
