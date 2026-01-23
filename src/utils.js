export const convertDateDMYtoMDY = ( str ) => {
    const [ day, month, year ] = str.split( '/' );
    return `${month}/${day}/${year}`;
};

export const convertDateMDYtoDMY = ( str ) => {
    const [ month, day, year ] = str.split( '/' );
    return `${day}/${month}/${year}`;
};