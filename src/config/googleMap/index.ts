export default (): { googleMapApiKey: string } => {
  return {
    googleMapApiKey: process.env.GOOGLE_MAP_API_KEY,
  };
};
