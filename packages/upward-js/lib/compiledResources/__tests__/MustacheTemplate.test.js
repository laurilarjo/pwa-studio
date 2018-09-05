const MustacheTemplate = require('../MustacheTemplate');
const AbstractCompiledResource = require('../AbstractCompiledResource');

test('supported extensions include standard .mst and .mustache', () => {
    expect(MustacheTemplate.supportedExtensions).toEqual(
        expect.arrayContaining(['.mst', '.mustache'])
    );
});

test('extends AbstractCompiledResource concretely', () => {
    const io = {
        readFile: () => {}
    };
    const instantiate = () => new MustacheTemplate('', io);
    expect(instantiate).not.toThrow();
    expect(instantiate()).toBeInstanceOf(AbstractCompiledResource);
});

test('throws if IOInterface is not present or lacks methods at constructor time', () => {
    expect(() => new MustacheTemplate('')).toThrow(
        'IOInterface as second argument'
    );
});

test('compiles Mustache ', async () => {
    const template = new MustacheTemplate(
        `
            {{#existenz}}
                Existenz is {{status}}!
            {{/existenz}}
            {{^existenz}}
            What, you hate Cronenberg?
            {{/existenz}}
        `,
        { readFile: () => {} }
    );
    await expect(template.compile()).resolves.not.toThrow();
    await expect(
        template.render({ existenz: { status: 'paused' } })
    ).resolves.toMatchInlineSnapshot(`"Existenz is paused!"`);
    await expect(
        template.render({
            existenz: [
                { status: 'a movie with a weird goop gun in it' },
                { status: 'overshadowed by The Matrix' }
            ]
        })
    ).resolves.toMatchInlineSnapshot(`
"Existenz is a movie with a weird goop gun in it!
                Existenz is overshadowed by The Matrix!"
`);
    await expect(template.render({})).resolves.toMatchInlineSnapshot(
        `"What, you hate Cronenberg?"`
    );
    await expect(template.render()).resolves.toMatchInlineSnapshot(
        `"What, you hate Cronenberg?"`
    );
});

test('loads Mustache partials using io', async () => {
    const io = {
        readFile: jest.fn(
            (name, encoding) =>
                `<h2>Hello {{addressee}}, I am the template called ${name}!</h2>`
        )
    };
    const template = new MustacheTemplate(
        `
        <h1>Important announcements!</h1>
        {{> firstPartial}}
        {{> secondPartial}}
    `,
        io
    );
    await expect(template.compile()).resolves.not.toThrow();
    await expect(template.render({ addressee: 'unit test' })).resolves
        .toMatchInlineSnapshot(`
"<h1>Important announcements!</h1>
        <h2>Hello unit test, I am the template called firstPartial!</h2>        <h2>Hello unit test, I am the template called secondPartial!</h2>"
`);
    expect(io.readFile).toHaveBeenCalledTimes(2);
    expect(io.readFile.mock.calls).toMatchObject([
        ['firstPartial', 'utf8'],
        ['secondPartial', 'utf8']
    ]);
});

test('loads descendent partials using io', async () => {
    const io = {
        readFile: jest.fn((name, encoding) => {
            if (name === 'subPartial') {
                return `I'm a subpartial, {{addressee}}!!`;
            }
            return `<h2>Hello {{addressee}}, I am the template called ${name}, and I have sub-partials!</h2> {{> subPartial}}`;
        })
    };
    const template = new MustacheTemplate(
        `
    <h1>Important announcements!</h1>
    {{> firstPartial}}
    {{> secondPartial}}
`,
        io
    );
    await expect(template.compile()).resolves.not.toThrow();
    await expect(template.render({ addressee: 'unit test' })).resolves
        .toMatchInlineSnapshot(`
"<h1>Important announcements!</h1>
    <h2>Hello unit test, I am the template called firstPartial, and I have sub-partials!</h2> I'm a subpartial, unit test!!    <h2>Hello unit test, I am the template called secondPartial, and I have sub-partials!</h2> I'm a subpartial, unit test!!"
`);
    expect(io.readFile).toHaveBeenCalledTimes(3);
    expect(io.readFile.mock.calls).toMatchObject([
        ['firstPartial', 'utf8'],
        ['secondPartial', 'utf8'],
        ['subPartial', 'utf8']
    ]);
});
